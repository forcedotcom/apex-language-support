/**
 * StubProvider is a callback interface that you can use as part of the Apex stub API to implement a mocking framework. Use this interface with the Test.createStub() method to create stubbed Apex objects for testing.
 */
global interface StubProvider {

  /**
   * Use this method to define the behavior of each method of a stubbed class.
   * @param stubbedObject The stubbed object.
   * @param stubbedMethodName The name of the invoked method.
   * @param returnType The return type of the invoked method.
   * @param listOfParamTypes A list of the parameter types of the invoked method.
   * @param listOfParamNames A list of the parameter names of the invoked method.
   * @param listOfArgs The actual argument values passed into this method at runtime.
   * @return Object
   */
  Object handleMethodCall(Object stubbedObject, String stubbedMethodName, System.Type returnType, List<System.Type> listOfParamTypes, List<String> listOfParamNames, List<Object> listOfArgs);

}