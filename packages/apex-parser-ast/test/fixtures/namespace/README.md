# Namespace Test Fixtures

This directory contains Apex source code files used in namespace-related tests. These fixtures are extracted from the test files to provide reusable, well-organized test data.

## Fixture Files

### Top-Level Types
- **`top-level-class.cls`** - Basic class with field and method
- **`top-level-interface.cls`** - Interface with method declaration
- **`top-level-enum.cls`** - Enum with multiple values
- **`top-level-trigger.trigger`** - Trigger on Account object

### Inner Types
- **`inner-class.cls`** - Outer class containing inner class
- **`inner-interface.cls`** - Outer class containing inner interface
- **`inner-enum.cls`** - Outer class containing inner enum

### Methods and Constructors
- **`method-in-class.cls`** - Class with method
- **`method-in-interface.cls`** - Interface with method
- **`constructor.cls`** - Class with constructor

### Fields and Properties
- **`field-in-class.cls`** - Class with private field
- **`property-in-class.cls`** - Class with getter/setter property

### Variables and Parameters
- **`local-variable.cls`** - Method with local variable
- **`method-parameter.cls`** - Method with parameter

### Complex Scenarios
- **`enum-with-values.cls`** - Enum with multiple values
- **`nested-inner-classes.cls`** - Complex nested structure
- **`multiple-inner-classes.cls`** - Multiple inner classes in outer class

### Edge Cases
- **`no-namespace.cls`** - Class without namespace
- **`backward-compatibility.cls`** - Class for compatibility testing

### Debug Tests
- **`debug-method-extraction.cls`** - For method name extraction debugging
- **`debug-interface-method.cls`** - For interface method debugging

### Compiler Service Tests
- **`compiler-service-basic.cls`** - Basic class for compiler service tests

## Usage

These fixtures are used in various namespace-related tests:

1. **Namespace Inheritance Tests** - Testing how namespaces are inherited by different symbol types
2. **FQN Generation Tests** - Testing fully qualified name generation with namespaces
3. **Compiler Integration Tests** - Testing namespace handling in the compiler service
4. **Debug Tests** - Testing and debugging namespace resolution issues

## Test Coverage

The fixtures cover:
- ✅ All top-level Apex types (class, interface, enum, trigger)
- ✅ Inner types with namespace inheritance
- ✅ Methods, constructors, fields, properties
- ✅ Local variables and parameters
- ✅ Complex nested structures
- ✅ Edge cases and backward compatibility
- ✅ Debug scenarios for troubleshooting

## Namespace Context

These fixtures are typically tested with:
- **Project Namespace**: `MyNamespace`
- **Expected FQN Pattern**: `mynamespace/symbolname`
- **Namespace Inheritance**: All symbols inherit the project namespace
- **Edge Cases**: No namespace, empty namespace, backward compatibility 