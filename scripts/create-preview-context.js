const vm = require("vm");

const { readSource } = require("./source-loader");

const DEFAULT_PREVIEW_SOURCES = ["src/core/namespace.jsx", "src/core/midi-file.jsx", "src/ae/expressions.jsx"];

function createPreviewContext(sourceFiles) {
  const files = sourceFiles || DEFAULT_PREVIEW_SOURCES;
  const context = {
    console,
    CompItem: function CompItem() {},
    ReOmMIDI: {}
  };
  context.global = context;
  vm.createContext(context);

  files.forEach((relativePath) => {
    vm.runInContext(readSource(relativePath), context, { filename: relativePath });
  });

  return context;
}

module.exports = {
  createPreviewContext,
  DEFAULT_PREVIEW_SOURCES
};
