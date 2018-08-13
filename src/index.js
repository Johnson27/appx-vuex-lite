let actionsCache = {};
let mutationsCache = {};
let storeInstance = '';

import EventEmitter from './emitter';
// const EventEmitter = require('./emitter').default;
const emitter = new EventEmitter();


// for dev tools in future
function logger() {
  return console.info.apply(this, arguments);
}

function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

function isString(str) {
  return Object.prototype.toString.call(str) === '[object String]';
};

export function setIn(state, array, value) {
  const setRecursively = function (state, array, value, index) {
    let clone = {};
    let prop = array[index];
    let newState;
    if (array.length > index) {
      // get cloned object
      if (Array.isArray(state)) {
        clone = state.slice(0);
      } else {
        clone = Object.assign({}, state);
      }
      // not exists, make new {}
      newState = state[prop] !== undefined ? state[prop] : {};
      clone[prop] = setRecursively(newState, array, value, index + 1);
      return clone;
    }
    return value;
  };

  return setRecursively(state, array, value, 0);
}

const innerMutation = {
    _setIn: (s, d) => setIn(s, d.path, d.value),
}

function createHelpers(actions, mutationsObj) {
  const mutations = Object.assign({}, mutationsCache, mutationsObj, innerMutation);
  return {
    commit(type, payload) {
      if (!type) {
        throw new Error(`not found ${type} action`);
      }
      if (isObject(type)) {
        payload = type;
        type = 'update';
      }
      // if ()
      logger('%c prev state', 'color: #9E9E9E; font-weight: bold', this.data);
      logger(`%c mutation: ${type}`, 'color: #03A9F4; font-weight: bold', payload, new Date().getTime());
      const finalMutation = mutations[type] ? mutations[type](this.data, payload) : payload;
      this.setData(finalMutation);
      emitter.emitEvent('updateState', { ...this.data });
      logger('%c next state', 'color: #4CAF50; font-weight: bold', this.data);
      // commit 的结果是一个同步行为
      return this.data;
    },
    dispatch(type, payload) {
      const actionCache = Object.assign({}, actions, this);
      const actionFunc = actionCache[type];
      if (!actionFunc) {
        throw new Error('not found an action');
      }
      const self = this;
      logger(`%c action ${type} dispatching`, 'color: #9E9E9E; font-weight: bold', payload);
      const res = actionFunc.call(self, {
        commit: this.commit.bind(self),
        dispatch: this.dispatch.bind(self),
        put: function (type, ...args) {
          const func = actionCache[type];
          if (!func) {
            throw new Error(`not found ${type} action`);
          }
          if (func) {
            func.apply(self, args);
          }
        },
        get state() {
          return self.data;
        }
      }, payload);
      // 保证结果为一个 promise
      if (res instanceof Promise) {
        return res;
      }
      return Promise.resolve(res);
    }
  };
}

export function storeHelper(actions, mutations, config) {
  return {
    ...config,
    ...createHelpers.call(this, actions, mutations),
  };
}

function setDataByStateProps(mapStateToProps, data, config) {
    if (Array.isArray(mapStateToProps)) {
        const outterState = mapStateToProps.reduce((p, v) => {
        p[v] = data[v];
        return p;
        }, {});
        return outterState;
    } else {
        const outterState = Object.keys(mapStateToProps).reduce((p, v) => {
        if (isString(mapStateToProps[v])) {
            p[v] = data[mapStateToProps[v]];
        } else {
            p[v] = mapStateToProps[v](data, config);
        }
        return p;
        }, {});
        return outterState; 
    }
}


export function connect(options) {
  const { mapStateToProps } = options;
  return function (config) {
    const _didMount = config.didMount;
    Object.assign(mutationsCache, config.mutations || {});
    return {
      ...config,
      methods: {
        ...config.methods,
        ...createHelpers.call(this, actionsCache, mutationsCache)
      },
      didMount() {
        const initialData = setDataByStateProps(mapStateToProps, Store.getInstance.data, config);
        this.setData(initialData);
        if (mapStateToProps) {
          emitter.addListener('updateState', (data = {}) => {
            const nextData = setDataByStateProps(mapStateToProps, data, config);
            this.setData(nextData);
          });
        }
        if (typeof _didMount === 'function') {
          _didMount.call(this);
        }
      }
    };
  };
}

export default function Store(store, options) {
  const actions = store.actions || store;
  const mutations = store.mutations || {};
  Object.assign(actionsCache, actions);
  Object.assign(mutationsCache, mutations);
  const state = store.state || {};  
  return function(config) {
    config.data = config.data || {};
    Object.assign(config.data, config.state);
    const originOnLoad = config.onLoad;
    // sync state for data
    config.onLoad = function() {
      Store.getInstance = this;
      Object.defineProperty(this, 'state', {
        get: function() { return this.data; }
      });
      if (originOnLoad) {
        originOnLoad.apply(this, arguments);
      }
    };
    return storeHelper(actions, mutations, config);
  };
}
