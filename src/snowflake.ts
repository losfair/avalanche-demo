import { NodePolicy, NodePolicyBuilder, Network, UserContext } from "./network";

class SnowflakeRequest<C> {
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

export class Snowflake<T extends UserContext<C>, C> implements NodePolicy<T, C, Snowflake<T, C>, SnowflakeBuilder<T, C>> {
    color: C;
    requestQueue: SnowflakeRequest<C>[];
    cnt: number;
    decided: boolean;

    constructor() {
        this.color = null;
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
        this.requestQueue = [];
    }

    async tick(userContext: T, network: Network<T, C, Snowflake<T, C>, SnowflakeBuilder<T, C>>): Promise<void> {
        if (this.decided) return;

        if (!this.color) return;

        let sample = network.randomlySampleNodes(userContext.sampleSize);
        let queryResult = await Promise.all(sample.map(node => {
            let req = new SnowflakeRequest<C>(this.color);
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
                if (this.color != result) {
                    this.cnt = 0;
                } else {
                    this.cnt++;
                    if (this.cnt > userContext.beta) {
                        this.decided = true;
                    }
                }
                this.color = result;
                break;
            }
        }

        userContext.updateColor(this.color);
    }
}

export class SnowflakeBuilder<T extends UserContext<C>, C> implements NodePolicyBuilder<T, C, Snowflake<T, C>, SnowflakeBuilder<T, C>> {
    buildPolicy(): Snowflake<T, C> {
        return new Snowflake();
    }
}
