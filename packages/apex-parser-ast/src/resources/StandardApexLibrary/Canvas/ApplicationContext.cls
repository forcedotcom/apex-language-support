/**
 * Use this interface to retrieve application context information, such as the application version or URL.
 */
global interface ApplicationContext {

  String getCanvasUrl();

  String getDeveloperName();

  String getName();

  String getNamespace();

  String getVersion();

  void setCanvasUrlPath(String newPath);

}