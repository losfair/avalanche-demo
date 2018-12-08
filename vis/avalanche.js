const network = require("../build/network");
const slush = require("../build/slush");
const snowflake = require("../build/snowflake");
const snowball = require("../build/snowball");

let intervalId = null;

class UserContext {
    constructor(id, nodes, byzantine) {
        this.id = id;
        this.nodes = nodes;
        this.color = null;
        this.byzantine = byzantine;
        this.sampleSize = 10;
        this.alpha = 0.8;
        this.beta = 15;
        this.messageCount = 0;
    }

    updateColor(color) {
        if (color != this.color) {
            console.log((this.byzantine ? "[B] " : "") + this.id + ": " + this.color + " -> " + color);
            this.color = color;
            this.nodes.update({
                id: this.id,
                color: {
                    background: color
                },
                borderWidth: this.byzantine ? 2 : 0,
            });
        }
    }

    byzantineColor(color) {
        return "rgb(0, 0, 255)";
    }
}

window.resetView = function (container, policy, numNodes, byzantineProbability, numInitialColors, decidedCallback = null) {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }

    let nodesArray = [];
    for (let i = 1; i <= numNodes; i++) {
        nodesArray.push({
            id: i,
            label: "" + i,
        });
    }
    let nodes = new vis.DataSet(nodesArray);
    let edges = new vis.DataSet([]);

    let netNodes = nodesArray.map((node) => {
        return {
            userContext: new UserContext(node.id, nodes, Math.random() < byzantineProbability)
        };
    });

    let policyBuilder = null;
    switch (policy) {
        case "slush":
            policyBuilder = new slush.SlushBuilder();
            break;
        case "snowflake":
            policyBuilder = new snowflake.SnowflakeBuilder();
            break;
        case "snowball":
            policyBuilder = new snowball.SnowballBuilder();
            break;
        default:
            throw new Error("invalid policy");
    }
    let net = new network.Network(netNodes, policyBuilder);
    for (let i = 0; i < numInitialColors; i++) {
        net.nodes[Math.floor(Math.random() * net.nodes.length)].policy.color = randomColor();
    }
    //net.nodes[0].policy.color = DEFAULT_COLOR;

    let options = {
        nodes: {
            color: {
                background: "rgb(200, 200, 200)",
                border: "rgb(0, 0, 0)"
            },
            shape: "dot",
            size: 10,
            borderWidth: 0,
        },
        layout: {
            improvedLayout: false,
        },
    };
    new vis.Network(container, {
        nodes: nodes,
        edges: edges,
    }, options);

    intervalId = setInterval(() => {
        net.tick();
        let allDecided = true;
        for (let n of net.nodes) {
            if (n.config.userContext.byzantine) continue;

            if (!n.policy.decided) {
                allDecided = false;
                break;
            }
        }
        if (allDecided) {
            console.log("All correct nodes are decided.");
            if (intervalId !== null) {
                clearInterval(intervalId);
                intervalId = null;
            }
            if (decidedCallback) decidedCallback();
        }
    }, 200);
}

function randomColor() {
    let rr = Math.floor(Math.random() * 256);
    let gg = Math.floor(Math.random() * 256);
    let bb = Math.floor(Math.random() * 256);
    return `rgb(${rr},${gg},${bb})`;
}