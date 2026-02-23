export interface RangerBox {
    name: string;
    title: string;
    state?: "expanded" | "collapsed" | "plain";
    editlinks?: "off";
    above?: string;
    below?: string;
    striped?: "even" | "odd";
    sections: RangerBoxSection[];
}

export interface RangerBoxSection {
    order: string;
    title: string;
    state?: "expanded" | "collapsed" | "plain";
    sections?: RangerBoxSection[];
    items?: string[];
}

