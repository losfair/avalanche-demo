export interface UserContext<C> {
    byzantine: boolean;
    sampleSize: number;
    alpha: number;
    beta: number;
    messageCount: number;
    updateColor(color: C): void;
    byzantineColor(color: C): C;
}

export class NodeConfig<T extends UserContext<C>, C> {
    userContext: T;
}

class Node<T extends UserContext<C>, C, P extends NodePolicy<T, C, P, B>, B extends NodePolicyBuilder<T, C, P, B>> {
    policy: P;
    config: NodeConfig<T, C>;
    shuffledRequestQueue: any[];

    constructor(config: NodeConfig<T, C>, policy: P) {
        this.config = config;
        this.policy = policy;
        this.shuffledRequestQueue = [];
    }
}

export interface NodePolicy<T extends UserContext<C>, C, P extends NodePolicy<T, C, P, B>, B extends NodePolicyBuilder<T, C, P, B>> {
    color: C;
    requestQueue: any[],
    query(userContext: T): void;
    tick(userContext: T, network: Network<T, C, P, B>): Promise<void>;
}

export interface NodePolicyBuilder<T extends UserContext<C>, C, P extends NodePolicy<T, C, P, B>, B extends NodePolicyBuilder<T, C, P, B>> {
    buildPolicy(): P;
}

export class Network<T extends UserContext<C>, C, P extends NodePolicy<T, C, P, B>, B extends NodePolicyBuilder<T, C, P, B>> {
    nodes: Node<T, C, P, B>[];

    constructor(nodes: NodeConfig<T, C>[], policyBuilder: B) {
        this.nodes = nodes.map(node => new Node(node, policyBuilder.buildPolicy()));
    }

    randomlySampleNodes(k: number): Node<T, C, P, B>[] {
        let nodes = this.nodes.map(v => v);
        shuffleInPlace(nodes);

        if (k > nodes.length) {
            k = nodes.length;
        }

        return nodes.slice(0, k);
    }

    tick() {
        // Simulate async network.
        for (let node of this.nodes) {
            let currentQueueLen = node.policy.requestQueue.length;

            for (let req of node.policy.requestQueue) {
                node.shuffledRequestQueue.push(req);
            }

            shuffleInPlace(node.shuffledRequestQueue);

            let k = Math.floor(currentQueueLen * 2 * Math.random());
            if (k < 100) k = 100;
            if (k > node.shuffledRequestQueue.length) k = node.shuffledRequestQueue.length;

            node.policy.requestQueue = node.shuffledRequestQueue.splice(0, k);
            node.policy.query(node.config.userContext);
        }

        for (let node of this.nodes) {
            node.policy.tick(node.config.userContext, this);
        }
    }
}

function shuffleInPlace<T>(a: T[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}
