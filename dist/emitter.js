'use strict';Object.defineProperty(exports,'__esModule',{value:true});function EventEmitter(){}var proto=EventEmitter.prototype;var originalGlobalValue=exports.EventEmitter;function indexOfListener(a,b){var c=a.length;while(c--){if(a[c].listener===b){return c}}return-1}function alias(a){return function b(){return this[a].apply(this,arguments)}}proto.getListeners=function a(b){var c=this._getEvents();var d;var e;if(b instanceof RegExp){d={};for(e in c){if(c.hasOwnProperty(e)&&b.test(e)){d[e]=c[e]}}}else{d=c[b]||(c[b]=[])}return d};proto.flattenListeners=function a(b){var c=[];var d;for(d=0;d<b.length;d+=1){c.push(b[d].listener)}return c};proto.getListenersAsObject=function a(b){var c=this.getListeners(b);var d;if(c instanceof Array){d={};d[b]=c}return d||c};function isValidListener(a){if(typeof a==='function'||a instanceof RegExp){return true}else if(a&&typeof a==='object'){return isValidListener(a.listener)}else{return false}}proto.addListener=function a(b,c){if(!isValidListener(c)){throw new TypeError('listener must be a function')}var d=this.getListenersAsObject(b);var e=typeof c==='object';var f;for(f in d){if(d.hasOwnProperty(f)&&indexOfListener(d[f],c)===-1){d[f].push(e?c:{listener:c,once:false})}}return this};proto.on=alias('addListener');proto.addOnceListener=function a(b,c){return this.addListener(b,{listener:c,once:true})};proto.once=alias('addOnceListener');proto.defineEvent=function a(b){this.getListeners(b);return this};proto.defineEvents=function a(b){for(var c=0;c<b.length;c+=1){this.defineEvent(b[c])}return this};proto.removeListener=function a(b,c){var d=this.getListenersAsObject(b);var e;var f;for(f in d){if(d.hasOwnProperty(f)){e=indexOfListener(d[f],c);if(e!==-1){d[f].splice(e,1)}}}return this};proto.off=alias('removeListener');proto.addListeners=function a(b,c){return this.manipulateListeners(false,b,c)};proto.removeListeners=function a(b,c){return this.manipulateListeners(true,b,c)};proto.manipulateListeners=function a(b,c,d){var e;var f;var g=b?this.removeListener:this.addListener;var h=b?this.removeListeners:this.addListeners;if(typeof c==='object'&&!(c instanceof RegExp)){for(e in c){if(c.hasOwnProperty(e)&&(f=c[e])){if(typeof f==='function'){g.call(this,e,f)}else{h.call(this,e,f)}}}}else{e=d.length;while(e--){g.call(this,c,d[e])}}return this};proto.removeEvent=function a(b){var c=typeof b;var d=this._getEvents();var e;if(c==='string'){delete d[b]}else if(b instanceof RegExp){for(e in d){if(d.hasOwnProperty(e)&&b.test(e)){delete d[e]}}}else{delete this._events}return this};proto.removeAllListeners=alias('removeEvent');proto.emitEvent=function a(b,c){var d=this.getListenersAsObject(b);var e;var f;var g;var h;var i;for(h in d){if(d.hasOwnProperty(h)){e=d[h].slice(0);for(g=0;g<e.length;g++){f=e[g];if(f.once===true){this.removeListener(b,f.listener)}i=f.listener.call(this,c||[]);if(i===this._getOnceReturnValue()){this.removeListener(b,f.listener)}}}}return this};proto.trigger=alias('emitEvent');proto.emit=function a(b){var c=Array.prototype.slice.call(arguments,1);return this.emitEvent(b,c)};proto.setOnceReturnValue=function a(b){this._onceReturnValue=b;return this};proto._getOnceReturnValue=function a(){if(this.hasOwnProperty('_onceReturnValue')){return this._onceReturnValue}else{return true}};proto._getEvents=function a(){return this._events||(this._events={})};EventEmitter.noConflict=function a(){exports.EventEmitter=originalGlobalValue;return EventEmitter};exports.default=EventEmitter;