module.exports = function (RED) {

    function QueuePlus(config) {
        RED.nodes.createNode(this, config);
        this.autoTriggerOn = config.autoTriggerOn;
        this.autoTriggerTime = config.autoTriggerTime;
        this.sendComplete = config.sendComplete;
        this.queueFullMessage = config.queueFullMessage;
        var node = this;
        var context = this.context();
        context.queue = context.queue || [];
        context.busy = context.busy || false;


        node.on('input', function (msg) {
            node.send(process(msg));
            updateStatus();
        });

        function process(msg) {
            if (msg.hasOwnProperty("reset")) {
                context.queue = [];
                context.busy = false;
            } else if (msg.hasOwnProperty("trigger")) {
                if (context.queue.length > 0) {
                    var m = context.queue.shift();
                    var out1 = {};
                    if (node.queueFullMessage === true) {
                        out1 = m;
                    } else {
                        out1.payload = m;
                    }
                    if (context.queue.length === 0) {
                        if (node.sendComplete === true) out1.complete = true;
                        node.send([null, { payload: 'end' }]);
                        context.busy = false;
                    }
                    return [out1, null, {
                        payload: context.queue.length
                    }];
                } else {
                    context.busy = false;
                    return [null, {
                        payload: 'nodata'
                    }];
                }
            } else {

                if (node.queueFullMessage === true) {
                    context.queue.push(msg);
                } else {
                    context.queue.push(msg.payload);
                }
                var x = context.busy;
                context.busy = true;
                if (x === false && node.autoTriggerOn === true) {
                    sleep(node.autoTriggerTime).then(() => {
                        //node.log("triggered autotriger");

                        node.send([null, {
                            payload: 'start'
                        }]);
                        msg.trigger = true;
                        node.send(process(msg));
                    })
                } else {
                    if (x === false) node.send([null, {payload: 'dataLoadedWaiting'}]);
                    return [null, null, {
                        payload: context.queue.length
                    }];
                }
            }
        }

        var updateStatus = throttle(function () {
            if (context.busy) {
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

        function sleep(time) {
            return new Promise((resolve) => setTimeout(resolve, time));
        }

        function throttle(func, wait, immediate) {
            var timeout;
            return function () {
                var context = this,
                    args = arguments;
                var later = function () {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                if (!timeout) timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        };

    }

    RED.nodes.registerType("queue-plus", QueuePlus);
}
