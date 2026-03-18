/*
 * Child class for cross-file inheritance e2e testing.
 * Used as the SOURCE in cross-file go-to-definition and hover tests.
 * Extends a base class defined in a separate file.
 */
public class CrossFileChildClass extends CrossFileBaseClass {
    private String childName;

    /**
     * Constructor.
     */
    public CrossFileChildClass(String name) {
        super(name);
        this.childName = name;
    }

    /**
     * Default constructor.
     */
    public CrossFileChildClass() {
        super();
        this.childName = 'CrossFileChildClass';
    }

    /**
     * Override of the virtual method from the base class.
     */
    public override String describe() {
        return 'Child: ' + childName + ' extends ' + super.describe();
    }

    /**
     * Child-specific method.
     */
    public String getChildName() {
        return this.childName;
    }

    /**
     * Uses the inherited getBaseName method from the base class.
     */
    public String getFullDescription() {
        return getBaseName() + ' / ' + getChildName();
    }
}
