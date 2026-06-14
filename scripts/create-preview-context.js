const vm = require("vm");

const { readSource } = require("./source-loader");

const DEFAULT_PREVIEW_SOURCES = [
  "dist/compiled/core/polyfill.jsx",
  "dist/compiled/core/namespace.jsx",
  "dist/compiled/core/midi-file.jsx",
  "dist/compiled/ae/expressions.jsx"
];

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
