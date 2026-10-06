/**
 * Contains methods for getting the Apex type that corresponds to an Apex class and for instantiating new types.
 * Usage
 * Use the forName methods to retrieve the type of an Apex class, which can be a built-in or a user-defined class. You can use these methods to retrieve the type of public and global classes, and not private classes even if the context user has access. Also, use the newInstance method if you want to instantiate a Type that implements an interface and call its methods while letting someone else, such as a subscriber of your package, provide the methods’ implementations.
 * Note
 * A call to Type.forName() can cause the class to be compiled.
 * Example: Instantiating a Type Based on Its Name
 * The following sample shows how to use the Type methods to instantiate a Type based on its name. A typical application of this scenario is when a package subscriber provides a custom implementation of an interface that is part of an installed package. The package can get the name of the class that implements the interface through a custom setting in the subscriber’s org. The package can then instantiate the type that corresponds to this class name and invoke the methods that the subscriber implemented.
 * In this sample, Vehicle represents the interface that the VehicleImpl class implements. The last class contains the code sample that invokes the methods implemented in VehicleImpl.
 * This is the Vehicle interface.
 * global interface Vehicle {
 *     Long getMaxSpeed();
 *     String getType();
 * }
 * This is the implementation of the Vehicle interface.
 * global with sharing class VehicleImpl implements Vehicle {
 *     global Long getMaxSpeed() { return 100; }
 *     global String getType() { return 'Sedan'; }
 * }
 * The method in this class gets the name of the class that implements the Vehicle interface through a custom setting value. It then instantiates this class by getting the corresponding type and calling the newInstance method. Next, it invokes the methods implemented in VehicleImpl. This sample requires that you create a public list custom setting named CustomImplementation with a text field named className. Create one record for this custom setting with a data set name of Vehicle and a class name value of VehicleImpl.
 * public with sharing class CustomerImplInvocationClass {
 *
 *     public static void invokeCustomImpl() {
 *         // Get the class name from a custom setting.
 *         // This class implements the Vehicle interface.
 *         CustomImplementation__c cs = CustomImplementation__c.getInstance('Vehicle');
 *
 *         // Get the Type corresponding to the class name
 *         Type t = Type.forName(cs.className__c);
 *
 *         // Instantiate the type.
 *         // The type of the instantiated object
 *         //   is the interface.
 *         Vehicle v = (Vehicle)t.newInstance();
 *
 *         // Call the methods that have a custom implementation
 *         System.debug('Max speed: ' + v.getMaxSpeed());
 *         System.debug('Vehicle type: ' + v.getType());
 *     }
 * }
 * Class Property
 * The class property returns the System.Type of the type it is called on. It’s exposed on all Apex built-in types including primitive data types and collections, sObject types, and user-defined classes. This property can be used instead of forName methods.
 * Call this property on the type name. For example:
 * System.Type t = Integer.class;
 * You can use this property for the second argument of JSON.deserialize, deserializeStrict, JSONParser.readValueAs, and readValueAsStrict methods to get the type of the object to deserialize. For example:
 * Decimal n = (Decimal)JSON.deserialize('100.1', Decimal.class);
 */
global class Type {
    /**
     * Returns true if the specified type is equal to the current type; otherwise, returns false.
     * Example
     * Type t1 = Account.class;
     * Type t2 = Type.forName('Account');
     * System.assert(t1.equals(t2));
     */
    global Boolean equals(Object o) { return false; }

    /**
     * Returns the type that corresponds to the specified fully qualified class name.
     * Usage
     * Note
     * This method returns null if called outside a managed package to get the type of a non-global class in a managed package. This is because the non-global class isn’t visible outside the managed package. For Apex saved using Salesforce API version 27.0 and earlier, this method does return the corresponding class type for the non-global managed package class.
     * When called from an installed managed package to get the name of a local type in an organization with no defined namespace, the forName(fullyQualifiedName) method returns null. Instead, use the forName(namespace, name) method and specify an empty string or null for the namespace argument.
     * A call to Type.forName() can cause the class to be compiled.
     */
    global static System.Type forName(String clsName) { return null; }

    /**
     * Returns the type that corresponds to the specified namespace and class name.
     * Usage
     * Note
     * This method returns null if called outside a managed package to get the type of a non-global class in a managed package. This is because the non-global class isn’t visible outside the managed package. For Apex saved using Salesforce API version 27.0 and earlier, this method does return the corresponding class type for the non-global managed package class.
     * Use this method instead of forName(fullyQualifiedName) if it’s called from a managed package installed in an organization with no defined namespace. To get the name of a local type, set the namespace argument to an empty string or null. For example, Type t = Type.forName('', 'ClassName');.
     * A call to Type.forName() can cause the class to be compiled.
     * Example
     * This example shows how to get the type that corresponds to the ClassName class and the MyNamespace namespace.
     * Type myType =
     *    Type.forName('MyNamespace', 'ClassName');
     * Versioned Behavior Changes
     * In API version 60.0 and later, using an invalid namespace while calling this method returns null. Previously, Apex allowed you to specify an invalid namespace such as Type.forName('InvalidNamespace', 'OuterClass.InnerClass') or use an outer class as a namespace such as Type.forName('OuterClass', 'InnerClass') with indeterminate results.
     */
    global static System.Type forName(String namespace, String clsName) { return null; }

    /**
     * Returns the name of the current type.
     * Example
     * This example shows how to get a Type’s name. It first obtains a Type by calling forName, then calls getName on the Type object.
     * Type t =
     *    Type.forName('MyClassName');
     *
     * String typeName =
     *    t.getName();
     * System.assertEquals('MyClassName',
     *    typeName);
     */
    global String getName() { return null; }

    /**
     * Returns a hash code value for the current type.
     * Usage
     * The returned hash code value corresponds to the type name hash code that String.hashCode returns.
     */
    global Integer hashcode() { return 0; }

    global Boolean isAssignableFrom(System.Type comparableType) { return false; }

    /**
     * Creates an instance of the current type and returns this new instance.
     * Usage
     * Because newInstance returns the generic object type, you should cast the return value to the type of the variable that will hold this value.
     * This method enables you to instantiate a Type that implements an interface and call its methods while letting someone else provide the methods’ implementation. For example, a package developer can provide an interface that a subscriber who installs the package can implement. The code in the package calls the subscriber's implementation of the interface methods by instantiating the subscriber’s Type.
     * Example
     * This example shows how to create an instance of a Type. It first gets a Type by calling forName with the name of a class (ShapeImpl), then calls newInstance on this Type object. The newObj instance is declared with the interface type (Shape) that the ShapeImpl class implements. The return value of the newInstance method is cast to the Shape type.
     * Type t =
     *    Type.forName('ShapeImpl');
     *
     * Shape newObj =
     *    (Shape)t.newInstance();
     */
    global Object newInstance() { return null; }

    /**
     * Returns a string representation of the current type, which is the type name.
     * Usage
     * This method returns the same value as getName. String.valueOf and System.debug use this method to convert their Type argument into a String.
     * Example
     * This example calls toString on the Type corresponding to a list of Integers.
     * Type t = List<Integer>.class;
     * String s = t.toString();
     * System.assertEquals('List<Integer>', s);
     */
    global override String toString() { return null; }
}