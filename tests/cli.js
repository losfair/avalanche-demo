const network = require("../build/network");
const slush = require("../build/slush");
const snowflake = require("../build/snowflake");

const N_NODES = 100;

class UserContext {
    constructor(name, byzantine) {
        this.name = name;
        this.color = null;
        this.byzantine = byzantine;
        this.sampleSize = 10;
        this.alpha = 0.7;
        this.beta = 5;
    }

    updateColor(color) {
        if (color != this.color) {
            console.log(this.name + ": " + this.color + " -> " + color);
            this.color = color;
        }
    }

    byzantineColor(color) {
        return "!" + color;
    }
}

let nodes = [];

for (let i = 0; i < N_NODES; i++) {
    let byzantine = (i % 5 == 0);
    nodes.push({
        userContext: new UserContext("" + i, byzantine),
    });
}

//let net = new network.Network(nodes, new slush.SlushBuilder());
let net = new network.Network(nodes, new snowflake.SnowflakeBuilder());
net.nodes[0].policy.color = "red";

let n_iter = 0;

setInterval(() => {
    n_iter++;
    net.tick();
    let all_red = true;
    let all_decided = true;
    for (let n of net.nodes) {
        if (n.policy.color != "red") {
            all_red = false;
        }
        if (!n.policy.decided) {
            all_decided = false;
        }
    }
    if (all_red) {
        console.log("All nodes are red.");
    }
    if (all_decided) {
        console.log("All nodes are decided in " + n_iter + " iterations.");
        process.exit(0);
    }
}, 100);
