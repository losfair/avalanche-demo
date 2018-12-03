import { NodePolicy, NodePolicyBuilder, Network, UserContext } from "./network";

class SnowballRequest<C> {
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

export class Snowball<T extends UserContext<C>, C> implements NodePolicy<T, C, Snowball<T, C>, SnowballBuilder<T, C>> {
    color: C;
    lastColor: C;
    colorCnt: Map<C, number>;
    requestQueue: SnowballRequest<C>[];
    cnt: number;
    decided: boolean;

    constructor() {
        this.color = null;
        this.lastColor = null;
        this.colorCnt = new Map();
        this.requestQueue = [];
        this.cnt = 0;
        this.decided = false;
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
        userContext.messageCount += this.requestQueue.length;
        this.requestQueue = [];
    }

    async tick(userContext: T, network: Network<T, C, Snowball<T, C>, SnowballBuilder<T, C>>): Promise<void> {
        if (this.decided) return;

        if (!this.color) return;

        let sample = network.randomlySampleNodes(userContext.sampleSize);
        let queryResult = await Promise.all(sample.map(node => {
            let req = new SnowballRequest<C>(this.color);
            node.policy.requestQueue.push(req);
            return req.getPromise();
        }));

        let m = new Map<C, number>();
        for (let result of queryResult) {
            let count = (m.get(result) || 0) + 1;
            m.set(result, count);
            if (count >= userContext.alpha * sample.length) {
                let oldColorCount = (this.colorCnt.get(result) || 0) + 1;
                this.colorCnt.set(result, oldColorCount);

                if (oldColorCount > (this.colorCnt.get(this.color) || 0)) {
                    this.color = result;
                }

                if (this.lastColor != result) {
                    this.lastColor = result;
                    this.cnt = 0;
                } else {
                    this.cnt++;
                    if (this.cnt > userContext.beta) {
                        this.decided = true;
                    }
                }
                break;
            }
        }

        userContext.updateColor(this.color);
    }
}

export class SnowballBuilder<T extends UserContext<C>, C> implements NodePolicyBuilder<T, C, Snowball<T, C>, SnowballBuilder<T, C>> {
    buildPolicy(): Snowball<T, C> {
        return new Snowball();
    }
}
