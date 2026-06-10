const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

const extraPlugins = [];
if ( process.env.ANALYZE ) {
	const { BundleAnalyzerPlugin } = require( 'webpack-bundle-analyzer' );
	extraPlugins.push( new BundleAnalyzerPlugin() );
}

module.exports = {
	...defaultConfig,
	optimization: {
		...defaultConfig.optimization,
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/](react|react-dom|@wordpress)[\\/]/,
					name: 'vendor',
					chunks: 'all',
					priority: 10,
				},
				mui: {
					test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
					name: 'mui',
					chunks: 'all',
					priority: 20,
				},
				muiDataGrid: {
					test: /[\\/]node_modules[\\/]@mui[\\/]x-data-grid[\\/]/,
					name: 'mui-datagrid',
					chunks: 'all',
					priority: 30,
				},
			},
		},
	},
	plugins: [ ...defaultConfig.plugins, ...extraPlugins ],
};
