export default function logger (option = {}) {

  return function (store) {
    store.subscribe((mutation, state, prevState) => {
      console.info('%c prev state', 'color: #9E9E9E; font-weight: bold', prevState);
      console.info(`%c mutation: ${mutation.type}`, 'color: #03A9F4; font-weight: bold', mutation.payload, new Date().getTime());
      console.info('%c next state', 'color: #4CAF50; font-weight: bold', state);
    }, (action = {}) => {
      console.info(`%c action ${action.type} dispatching`, 'color: #9E9E9E; font-weight: bold', action.payload);
    });
  }
}
