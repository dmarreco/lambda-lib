exports.clearAll = () => global.CONTEXT = undefined;

exports.replaceAllWith = ctx => global.CONTEXT = ctx;

exports.set = (key, value) => {
  if (!key.startsWith("x-correlation-")) {
    key = "x-correlation-" + key;
  }

  if (!global.CONTEXT) {
    global.CONTEXT = {};
  }

  global.CONTEXT[key] = value;
};

exports.get = () => global.CONTEXT || {};
