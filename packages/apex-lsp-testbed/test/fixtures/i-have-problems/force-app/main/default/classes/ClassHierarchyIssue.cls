/**
 * Demonstrates: Class extends non-virtual (final-by-default) class
 * Error Code: invalid.final.super.type
 * Validator: ClassHierarchyValidator (TIER 2)
 * 
 * Note: Requires FinalBaseClass.cls to be present in the workspace.
 * FinalBaseClass is final by default (not marked as virtual), so it cannot be extended.
 * In Apex, classes are final by default - use 'virtual' keyword to make them extensible.
 */
public class ClassHierarchyIssue extends FinalBaseClass {
    // Attempting to extend a non-virtual class (final by default) - error!
    public void childMethod() {
    }
}
