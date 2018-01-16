module.exports = function(RED) {

  function QueuePlus(config) {
    RED.nodes.createNode(this, config);
    this.autoTriggerOn = config.autoTriggerOn;
    var node = this;
    var context = this.context();
    context.queue = context.queue || [];
    context.busy = context.busy || false;
    sendComplete = false;
    //autoTriggerOn = true;
    autoTriggerTime = 1000;

    node.on('input', function(msg) {
      node.send(prosses(msg));
    });

    function prosses(msg) {
      if (msg.hasOwnProperty("trigger")) {
        if (context.queue.length > 0) {
          var m = context.queue.shift();
          node.status({
            fill: "blue",
            shape: "dot",
            text: context.queue.length
          });
          var out1 = {};
          out1.payload = m;
          if (context.queue.length === 0) {
            if (sendComplete === true) out1.complete = true;
            context.busy = false;
            node.status({
              fill: "blue",
              shape: "ring",
              text: context.queue.length
            });
          }
          return [out1, null, {
            payload: context.queue.length
          }];
        } else {
          context.busy = false;
          //var msg2 = {payload: 'end'};
          node.status({
            fill: "blue",
            shape: "ring",
            text: context.queue.length
          });
          return [null, {
            payload: 'end'
          }];
        }
      } else {
        context.queue.push(msg.payload);
        node.status({
          fill: "blue",
          shape: "dot",
          text: context.queue.length
        });
        var x = context.busy;
        context.busy = true;
        if (x === false && node.autoTriggerOn === true) {
          sleep(autoTriggerTime).then(() => {
            msg.trigger = true;
            node.send(prosses(msg));
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
  }

  RED.nodes.registerType("queue-plus", QueuePlus);
}
