const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');


 // 打包的时候解开注释(path, publicPath)，否则本地运行不起来
    // path: path.resolve(__dirname, '../screenServer/public/chatbox'),
    // publicPath: '/chatbox/',


module.exports = (env) => {
  console.log('env =======', env);
  const config = {
    entry: {
      main: './src/main.js',
      operator: './src/operator-main.js'
    },
  output: {
    filename: '[name].bundle.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]?[hash]'
        }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new Dotenv({
      path: env && env.production ? './.env.production' : './.env.development',
      systemvars: true
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      template: './test-operator-workspace.html',
      filename: 'operator.html',
      chunks: ['operator']
    })
  ],
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      '@': path.resolve(__dirname, 'src')
    },
    extensions: ['*', '.js', '.vue', '.json']
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public')
    },
    compress: true,
    port: 8080,
    hot: true,
    open: true
  }
  };

  if (env && env.production) {
    config.output.path = path.resolve(__dirname, '../screenServer/public/chatbox');
    config.output.publicPath = '/chatbox/';
  }

  return config;
};