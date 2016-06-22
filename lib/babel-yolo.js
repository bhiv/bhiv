module.exports = new function () {
  this.presets = [];
  this.presets.push(require('babel-preset-es2015'));

  this.plugins = [];
  this.plugins.push([require('babel-plugin-transform-es2015-template-literals'), { spec: true }]);
  this.plugins.push(require('babel-plugin-transform-es3-member-expression-literals'));
};