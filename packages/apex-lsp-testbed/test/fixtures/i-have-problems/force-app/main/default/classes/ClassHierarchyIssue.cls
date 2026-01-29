/**
 * Demonstrates: Class extends final class
 * Error Code: invalid.final.super.type
 * Validator: ClassHierarchyValidator (TIER 2)
 * 
 * Note: Requires FinalBaseClass.cls to be present in the workspace
 */
public class ClassHierarchyIssue extends FinalBaseClass {
    // Attempting to extend a final class - error!
    public void childMethod() {
    }
}
