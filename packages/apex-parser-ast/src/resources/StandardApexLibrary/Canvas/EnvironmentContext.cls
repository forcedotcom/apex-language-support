/**
 * Use this interface to retrieve environment context information, such as the app display location or the configuration parameters.
 */
global interface EnvironmentContext {

  void addEntityField(String fieldName);

  void addEntityFields(Set<String> fieldNames);

  String getDisplayLocation();

  List<String> getEntityFields();

  String getLocationUrl();

  String getParametersAsJSON();

  String getSublocation();

  void setParametersAsJSON(String jsonString);

}