public class IllegalAccessorOnProperty {
    // Invalid: final property cannot have setter
    public final String readOnlyProp {
        get;
        set; // Error: Cannot declare set accessor on final property
    }
    
    // Valid: final property with only getter
    public final String validReadOnlyProp {
        get;
    }
    
    // Valid: non-final property with both accessors
    public String readWriteProp {
        get;
        set;
    }
}
