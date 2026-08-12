/*
 * Base class for cross-file inheritance e2e testing.
 * Used as the TARGET in cross-file go-to-definition and hover tests.
 * CrossFileChildClass.cls extends this class from a separate file.
 */
public virtual class CrossFileBaseClass {
    protected String baseName;

    /**
     * Constructor.
     */
    public CrossFileBaseClass(String name) {
        this.baseName = name;
    }

    /**
     * Default constructor.
     */
    public CrossFileBaseClass() {
        this.baseName = 'CrossFileBaseClass';
    }

    /**
     * Virtual method that can be overridden by subclasses.
     */
    public virtual String describe() {
        return 'Base: ' + baseName;
    }

    /**
     * Non-virtual method inherited by subclasses.
     */
    public String getBaseName() {
        return this.baseName;
    }
}
