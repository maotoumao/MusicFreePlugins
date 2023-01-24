const fs = require('fs/promises');
const path = require('path');
const rimraf = require('rimraf')

const basePath = path.resolve(__dirname, '../dist');

async function run() {
    console.log('生成json文件...');
    const pluginPath = path.resolve(basePath, '_plugins');
    await rimraf(pluginPath);
    await fs.mkdir(pluginPath);
    const bundledPlugins = await fs.readdir(basePath);
    const output = {
        plugins: []
    };
    await Promise.all(bundledPlugins.map(async (bundleFolder) => {
        if (!bundleFolder.startsWith('_')) {
            try {
                const targetPluginPath = path.resolve(basePath, bundleFolder, 'index.js');
                await fs.stat(targetPluginPath);
                const targetPlugin = require(targetPluginPath);
                output.plugins.push({
                    name: targetPlugin.platform,
                    url: targetPlugin.srcUrl,
                    version: targetPlugin.version
                })
            } catch { }
        }
    }))

    await fs.writeFile(path.resolve(pluginPath, 'plugins.json'), JSON.stringify(output));
    console.log('done√');

}


run();