

export interface InfoboxData {
    /** Title for template box. Automatically filled by page name unless specified manually. */
    title?: string;

    /** Image names to display. If separated by a colon and descriptor, allows multiple images in tabs.
     * @example "Structure Assembler.png:Placed,Assembler.png:Inventory," */
    images?: string;

    /** Standard Recipe */
    recipe1?: string;

    /** Forge recipe */
    recipe2?: string;

    /** Lava Forge specific recipes */
    recipe3?: string;

    /** How many of this item can fit in a single stack. Automatically calculates the amount with the Organize upgrade. Enter only default value. */
    stack?: number;

    /** How many item slots does the storage container have. If not a storage container do not define. */
    storage?: number;

    /** Currently automatically adds {{time}} template to the end of the inputted number. Best used for mining and other 1-output calculation structures. */
    output?: number;

    /** Automatically adds {{time}} template to the end of the entered number. Number of items or fluid this item moves per minute. */
    transpd?: number;

    /** What value crafting speed modifier the building has. 100% = 1x multiplier in game files. Automatically adds % sign to end of the entered number. */
    craftspd?: number;

    /** Power used idle per min. Game code is 1 power = 60 S. 1000 S = 1 MS. Use 2 decimal places for maximum accuracy.
     * @example "600 S/min" */
    idle?: string;

    /** Power used active per min. Game code is 1 power = 60 S. 1000 S = 1 MS. Use 2 decimal places for maximum accuracy.
     * @example "1.80 MS/min" */
    active?: string;

    /** Biofuel required to use this structure per min. */
    biofuel?: number;

    /** What structure creates this item? Use the {{icon}} template. */
    prodby?: string;

    /** What can this item be used to create? Use the {{icon}} template. */
    reqfor?: string;

    /** What does this refine into? Use the {{icon}} template. */
    refto?: string;

    /** Hit Points */
    HP?: number;

    /** Attack */
    ATK?: number;

    /** Defense */
    DEF?: number;

    /** Energy */
    NRG?: number;
}