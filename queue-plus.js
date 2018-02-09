module.exports = function (RED) {

  function QueuePlus(config) {
    RED.nodes.createNode(this, config);
    this.autoTriggerOn = config.autoTriggerOn;
    this.autoTriggerTime = config.autoTriggerTime;
    this.sendComplete = config.sendComplete;
    var node = this;
    var context = this.context();
    context.queue = context.queue || [];
    context.busy = context.busy || false;


    node.on('input', function (msg) {
      node.send(process(msg));

      var myEfficientFn = debounce(function() {
        if (context.busy){
        node.status({
          fill: "blue",
          shape: "dot",
          text: context.queue.length
        });
      } else {
        node.status({
          fill: "blue",
          shape: "ring",
          text: context.queue.length
        });
      }
      }, 1000);
    });

    function process(msg) {
      if (msg.hasOwnProperty("reset")) {
        context.queue = [];
        context.busy = false;
      }
      else if (msg.hasOwnProperty("trigger")) {
        if (context.queue.length > 0) {
          var m = context.queue.shift();
          /*node.status({
            fill: "blue",
            shape: "dot",
            text: context.queue.length
          });*/
          var out1 = {};
          out1.payload = m;
          if (context.queue.length === 0) {
            if (node.sendComplete === true) out1.complete = true;
            context.busy = false;
            /*node.status({
              fill: "blue",
              shape: "ring",
              text: context.queue.length
            });*/
          }
          return [out1, null, {
            payload: context.queue.length
          }];
        } else {
          context.busy = false;
          /*node.status({
            fill: "blue",
            shape: "ring",
            text: context.queue.length
          });*/
          return [null, {
            payload: 'end'
          }];
        }
      } else {
        context.queue.push(msg.payload);
        /*node.status({
          fill: "blue",
          shape: "dot",
          text: context.queue.length
        });*/
        var x = context.busy;
        context.busy = true;
        if (x === false && node.autoTriggerOn === true) {
          sleep(node.autoTriggerTime).then(() => {
            node.send(null,{ payload: 'start'});
            msg.trigger = true;
            node.send(process(msg));
          })
        } else {
          return [null, null, {
            payload: context.queue.length
          }];
        }
      }
    }

    function sleep(time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    }

    function debounce(func, wait, immediate) {
      var timeout;
      return function() {
        var context = this, args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    };
  }

  RED.nodes.registerType("queue-plus", QueuePlus);
}
