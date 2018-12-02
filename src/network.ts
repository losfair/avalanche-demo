export interface UserContext<C> {
    byzantine: boolean;
    sampleSize: number;
    alpha: number;
    beta: number;
    updateColor(color: C): void;
    byzantineColor(color: C): C;
}

export class NodeConfig<T extends UserContext<C>, C> {
    userContext: T;
}

class Node<T extends UserContext<C>, C, P extends NodePolicy<T, C, P, B>, B extends NodePolicyBuilder<T, C, P, B>> {
    policy: P;
    config: NodeConfig<T, C>;

    constructor(config: NodeConfig<T, C>, policy: P) {
        this.config = config;
        this.policy = policy;
    }
}

export interface NodePolicy<T extends UserContext<C>, C, P extends NodePolicy<T, C, P, B>, B extends NodePolicyBuilder<T, C, P, B>> {
    color: C;
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
        for (let node of this.nodes) {
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
