let actionsCache = {};
let mutationsCache = {};
let storeInstance = '';

import EventEmitter from './emitter';
import Logger from './logger';


const _innerPlugins = {
  logger: Logger(),
}

const emitter = new EventEmitter();

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

      const prevState = { ...this.data };
      // emitter.emitEvent('beforeUpdateState', { state: { ...this.data }, mutation: { type, payload } });
      const finalMutation = mutations[type] ? mutations[type](this.data, payload) : payload;
      this.setData(finalMutation);
      emitter.emitEvent('updateState', { state: {...this.data},  mutation: { type, payload }, prevState });
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
      emitter.emitEvent('dispatchAction', { type, payload });
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
        const outterState = mapStateToProps
        .filter(d => !!d)
        .reduce((p, v) => {
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

function setStoreDataByState(storeData, state = {}) {
  const newData = Object.assign({}, storeData);
  Object.keys(state).forEach((key) => {
    if(newData.hasOwnProperty(key)) {
      newData[key] = state[key];
    }
  });
  return newData;
}

export function connect(options) {
  const { mapStateToProps = [] } = options;
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
          emitter.addListener('updateState', ({state = {}}) => {
            const nextData = setDataByStateProps(mapStateToProps, state, config);
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
  const plugins = store.plugins || [];
  Object.assign(actionsCache, actions);
  Object.assign(mutationsCache, mutations);
  const state = store.state || {};
  return function(config) {
    config.data = config.data || {};
    Object.assign(config.data, state, config.state);
    const originOnLoad = config.onLoad;
    // sync state for data
    config.onLoad = function() {
      this.subscribe = function(subscriber, actionSubscriber) {
        emitter.addListener('updateState', ({ state, mutation, prevState }) => {
          console.log('mutationsObj', mutation);
          subscriber(mutation, state, prevState);
        });
        if (actionSubscriber) {
          emitter.addListener('dispatchAction', (action) => {
            actionSubscriber(action);
          });
        }
      }
      Store.getInstance = this;

      emitter.addListener('updateState', ({state}) => {
        const nextData = setStoreDataByState(this.data, state);
        this.setData(nextData);
      });

      if (plugins) {
        plugins.forEach(element => {
          const pluginFunc = isString(element) ? _innerPlugins[element] : element;
          pluginFunc(Store.getInstance);
        });
      }
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
