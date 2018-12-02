import { NodePolicy, NodePolicyBuilder, Network, UserContext } from "./network";

class SlushRequest<C> {
    color: C;
    resolve: (color: C) => void;

    constructor(color: C) {
        this.color = color;
        this.resolve = null;
    }

    getPromise(): Promise<C> {
        return new Promise((resolve) => {
            this.resolve = resolve;
        })
    }
}

export class Slush<T extends UserContext<C>, C> implements NodePolicy<T, C, Slush<T, C>, SlushBuilder<T, C>> {
    color: C;
    requestQueue: SlushRequest<C>[];

    constructor() {
        this.color = null;
        this.requestQueue = [];
    }

    query(userContext: T) {
        for (let req of this.requestQueue) {
            if (!this.color) {
                this.color = req.color;
            }

            if (userContext.byzantine) {
                req.resolve(userContext.byzantineColor(this.color));
            } else {
                req.resolve(this.color);
            }
        }
        this.requestQueue = [];
    }

    async tick(userContext: T, network: Network<T, C, Slush<T, C>, SlushBuilder<T, C>>): Promise<void> {
        if (!this.color) return;

        let sample = network.randomlySampleNodes(userContext.sampleSize);
        let queryResult = await Promise.all(sample.map(node => {
            let req = new SlushRequest<C>(this.color);
            node.policy.requestQueue.push(req);
            return req.getPromise();
        }));

        let m = new Map<C, number>();
        for (let result of queryResult) {
            let count = m.get(result);
            if (!count) count = 0;
            count++;
            m.set(result, count);
            if (count >= userContext.alpha * sample.length) {
                this.color = result;
                break;
            }
        }

        userContext.updateColor(this.color);
    }
}

export class SlushBuilder<T extends UserContext<C>, C> implements NodePolicyBuilder<T, C, Slush<T, C>, SlushBuilder<T, C>> {
    buildPolicy(): Slush<T, C> {
        return new Slush();
    }
}
