/**
 * Contains methods to create, update, and retrieve information about invocable actions.
 */
public class Action {

  public Invocable.Action addInvocation() {}

  public Invocable.Action clearInvocations() {}

  public Object clone() {}

  public static Invocable.Action createCustomAction(String type, String namespace, String name) {}

  public static Invocable.Action createCustomAction(String type, String name) {}

  public static Invocable.Action createStandardAction(String type) {}

  public String getName() {}

  public String getNamespace() {}

  public String getType() {}

  public List<Invocable.Action.Result> invoke() {}

  public Boolean isStandard() {}

  public Invocable.Action setInvocationParameter(String parameterName, Object parameterValue) {}

  public Invocable.Action setInvocations(List<Map< String, ANY>> invocations) {}

}