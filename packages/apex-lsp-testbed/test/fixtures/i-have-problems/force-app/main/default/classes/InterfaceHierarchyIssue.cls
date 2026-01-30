/**
 * Demonstrates: Interface extends itself (self-reference)
 * Error Code: circular.definition
 * Validator: InterfaceHierarchyValidator (TIER 2)
 * 
 * Note: This demonstrates self-reference. For circular dependency
 * between multiple interfaces, see InterfaceA.cls and InterfaceB.cls
 */
public interface InterfaceHierarchyIssue extends InterfaceHierarchyIssue {
    // Interface extends itself - error!
    void doSomething();
}
