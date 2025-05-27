export enum SchemaNodeFormType
{
    /**
     * No form items
     */
    None = "",

    /**
     * expand sub node to generate form items
     */
    Expand = "expand",

    /**
     * expand all sub nodes(include sub node of sub node) to generate form items
     */
    ExpandAll = "expandall",

    /**
     * Generate the form item nested
     */
    Next = "nest",
}