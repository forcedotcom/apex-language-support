/**
 * StubProvider is a callback interface that you can use as part of the Apex stub API to implement a mocking framework. Use this interface with the Test.createStub() method to create stubbed Apex objects for testing.
 * Usage
 * The StubProvider interface allows you to define the behavior of a stubbed Apex class. The interface specifies a single method that requires implementing: handleMethodCall(). You specify the behavior of each method of the stubbed class in the handleMethodCall() method.
 * In your Apex test, you create a stubbed object using the Test.createStub() method. When you invoke methods on the stubbed object, StubProvider.handleMethodCall() is called, which performs the behavior that you’ve specified for each method.
 */
global interface StubProvider {
    virtual Boolean equals(Object arg0);

    /**
     * Use this method to define the behavior of each method of a stubbed class.
     * Usage
     * You can use the parameters passed into this method to identify which method on the stubbed object was invoked. Then you can define the behavior for each identified method.
     */
    abstract Object handleMethodCall(Object stubbedObject, String stubbedMethodName, System.Type returnType, List listOfParamTypes, List listOfParamNames, List listOfArgs);

    virtual Integer hashCode();

    virtual String toString();
}