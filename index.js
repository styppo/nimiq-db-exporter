const Nimiq = require('@nimiq/core');
const argv = require('minimist')(process.argv.slice(2));
const config = require('./src/Config.js')(argv.config);
const Exporter = require('./src/Exporter.js');

const TAG = 'Node';

Nimiq.Log.instance.level = config.log.level;
for (const tag in config.log.tags) {
    Nimiq.Log.instance.setLoggable(tag, config.log.tags[tag]);
}

for (const key in config.constantOverrides) {
    Nimiq.ConstantHelper.instance.set(key, config.constantOverrides[key]);
}

Nimiq.GenesisConfig.init(Nimiq.GenesisConfig.CONFIGS[config.network]);

for (const seedPeer of config.seedPeers) {
    Nimiq.GenesisConfig.SEED_PEERS.push(Nimiq.WsPeerAddress.seed(seedPeer.host, seedPeer.port, seedPeer.publicKey));
}

(async () => {
    const networkConfig = config.dumb
        ? new Nimiq.DumbNetworkConfig()
        : new Nimiq.WsNetworkConfig(config.host, config.port, config.tls.key, config.tls.cert);

    let consensus;
    switch (config.type) {
        case 'full':
            consensus = await Nimiq.Consensus.full(networkConfig);
            break;
        case 'light':
            consensus = await Nimiq.Consensus.light(networkConfig);
            break;
        case 'nano':
            consensus = await Nimiq.Consensus.nano(networkConfig);
            break;
    }

    const exporter = new Exporter(consensus, config);
    await exporter.init();

    Nimiq.Log.i(TAG, `Peer address: ${networkConfig.peerAddress.toString()} - public key: ${networkConfig.keyPair.publicKey.toHex()}`);
    Nimiq.Log.i(TAG, `Blockchain state: height=${consensus.blockchain.height}, headHash=${consensus.blockchain.headHash}`);

    consensus.on('established', () => {
        Nimiq.Log.i(TAG, `Blockchain ${config.type}-consensus established.`);
        Nimiq.Log.i(TAG, `Current state: height=${consensus.blockchain.height}, totalWork=${consensus.blockchain.totalWork}, headHash=${consensus.blockchain.headHash}`);
    });

    consensus.blockchain.on('head-changed', (head) => {
        if (consensus.established || head.height % 100 === 0) {
            Nimiq.Log.i(TAG, `Now at block: ${head.height}`);
        }
    });

    consensus.network.on('peer-joined', (peer) => {
        Nimiq.Log.i(TAG, `Connected to ${peer.peerAddress.toString()}`);
    });

    consensus.network.connect();
})().catch(e => {
    console.error(e);
    process.exit(1);
});
