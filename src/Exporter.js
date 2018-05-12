const Nimiq = require('@nimiq/core');
const mysql = require('mysql2/promise');

class Exporter {
    /**
     * @param {FullConsensus} consensus
     * @param {Config} config
     */
    constructor(consensus, config) {
        /** @type {FullChain} */
        this._blockchain = consensus.blockchain;

        /** @type {Config} */
        this._config = config;

        /** @type {Synchronizer} */
        this._synchronizer = new Nimiq.Synchronizer();
    }

    /**
     * @returns {Promise.<void>}
     */
    async init() {
        this._connectionPool = await mysql.createPool({
            host: this._config.database.host,
            database: this._config.database.name,
            user: this._config.database.user,
            password: this._config.database.password
        });

        await this._initDatabase();

        this._blockchain.on('head-changed', (block) => this._synchronizer.push(() => this._onHeadChanged(block)));
        this._blockchain.on('block-reverted', (block) => this._synchronizer.push(() => this._onBlockReverted(block)));
    }

    /**
     * @returns {Promise.<void>}
     * @private
     */
    async _initDatabase() {
        const [ rows ] = await this._connectionPool.execute('SELECT MAX(height) AS maxHeight FROM block');
        const maxHeight = rows[0].maxHeight;

        if (!maxHeight) {
            return this._insertBlocks(1);
        } else {
            // Check database consistency.
            const block = await this._blockchain.getBlockAt(maxHeight);
            if (!block) {
                throw new Error('Inconsistent database state');
            }

            const [ res ] = await this._connectionPool.execute('SELECT id FROM block WHERE height = ? AND hash = ?', [ maxHeight, block.hash().serialize() ]);
            if (res.length === 0) {
                throw new Error('Inconsistent database state');
            }

            return this._insertBlocks(maxHeight + 1);
        }
    }

    /**
     * @param {number} startHeight
     * @returns {Promise.<void>}
     * @private
     */
    async _insertBlocks(startHeight) {
        if (startHeight > this._blockchain.height) {
            return;
        }

        Nimiq.Log.i(Exporter, `Exporting blocks #${startHeight} - #${this._blockchain.height} ...`);

        let height = startHeight;
        let block = await this._blockchain.getBlockAt(height, /*includeBody*/ true);
        while (block) {
            await this._insert(block);
            block = await this._blockchain.getBlockAt(++height, /*includeBody*/ true);
        }
    }

    /**
     * @param {Block} block
     * @returns {Promise.<void>}
     * @private
     */
    _onHeadChanged(block) {
        return this._insert(block);
    }

    /**
     * @param {Block} block
     * @returns {Promise.<void>}
     * @private
     */
    async _insert(block) {
        let conn;
        try {
            conn = await this._connectionPool.getConnection();
            await conn.query('START TRANSACTION');
            await Exporter._insertBlock(conn, block);
            await conn.query('COMMIT');
        } catch (e) {
            await conn.query('ROLLBACK');
            Nimiq.Log.e(Exporter, e);
        } finally {
            if (conn) {
                conn.release();
            }
        }
    }

    /**
     * @param {mysql.Connection} conn
     * @param {Block} block
     * @returns {Promise.<void>}
     * @private
     */
    static async _insertBlock(conn, block) {
        let txValue = 0;
        let txFees = 0;
        for (const tx of block.transactions) {
            txValue += tx.value;
            txFees += tx.fee;
        }

        const query =
            'INSERT INTO block SET '
            + 'hash = ?, '
            + 'height = ?, '
            + 'timestamp = ?, '
            + 'n_bits = ?, '
            + 'miner_address = ?, '
            + 'extra_data = ?, '
            + 'tx_count = ?, '
            + 'tx_value = ?, '
            + 'tx_fees = ?, '
            + 'size = ?';
        const params = [
            block.hash().serialize(),
            block.height,
            block.timestamp,
            block.nBits,
            block.minerAddr.serialize(),
            block.body.extraData.byteLength > 0 ? block.body.extraData : null,
            block.transactionCount,
            txValue,
            txFees,
            block.serializedSize
        ];

        const [ result ] = await conn.execute(query, params);
        return Exporter._insertTransactions(conn, result.insertId, block.transactions);
    }

    /**
     * @param {mysql.Connection} conn
     * @param {number} blockId
     * @param {Array.<Transaction>} transactions
     * @returns {Promise.<void>}
     * @private
     */
    static async _insertTransactions(conn, blockId, transactions) {
        if (transactions.length === 0) {
            return Promise.resolve();
        }

        const query =
            'INSERT INTO transaction SET '
            + 'hash = ?, '
            + 'block_id = ?, '
            + 'sender_type = ?, '
            + 'sender_address = ?, '
            + 'recipient_type = ?, '
            + 'recipient_address = ?, '
            + 'value = ?, '
            + 'fee = ?, '
            + 'validity_start_height = ?, '
            + 'flags = ?, '
            + 'data = ?';
        const stmt = await conn.prepare(query);

        const promises = [];
        for (const tx of transactions) {
            promises.push(stmt.execute([
                tx.hash().serialize(),
                blockId,
                tx.senderType,
                tx.sender.serialize(),
                tx.recipientType,
                tx.recipient.serialize(),
                tx.value,
                tx.fee,
                tx.validityStartHeight,
                tx.flags,
                tx.data.byteLength > 0 ? tx.data.byteLength : null
            ]));
        }
        return Promise.all(promises);
    }

    /**
     * @param {Block} block
     * @returns {Promise.<void>}
     * @private
     */
    _onBlockReverted(block) {
        // It is sufficient to delete only the block here.
        // Transactions are deleted automatically by the DBMS upon block deletion.
        const query = 'DELETE FROM block WHERE hash = ?';
        const params = [ block.hash().serialize() ];
        return this._connectionPool.execute(query, params);
    }
}
module.exports = Exporter;