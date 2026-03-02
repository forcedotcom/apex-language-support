/**
 * Create, delete, get, publish, and update Data 360 segments.
 */
public class CdpSegment {

  public static ConnectApi.CdpSegmentOutput createSegment(ConnectApi.CdpSegmentInput input) {}

  public static ConnectApi.CdpSegmentOutput createSegment(ConnectApi.CdpSegmentInput input, String dataspace) {}

  public static ConnectApi.CdpSegmentActionOutput deactivateSegmentByApiName(String segmentApiName) {}

  public static ConnectApi.CdpSegmentActionOutput deactivateSegmentById(String segmentId) {}

  public static Void deleteSegment(String segmentApiName) {}

  public static ConnectApi.CdpSegmentActionOutput executePublishAdhoc(String segmentId) {}

  public static ConnectApi.CdpSegmentContainerOutput getSegment(String segmentApiName) {}

  public static ConnectApi.CdpSegmentContainerOutput getSegmentById(String segmentId) {}

  public static ConnectApi.CdpSegmentContainerOutput getSegments() {}

  public static ConnectApi.CdpSegmentContainerOutput getSegmentsPaginated(Integer batchSize, Integer offset, String orderBy) {}

  public static ConnectApi.CdpSegmentContainerOutput getSegmentsPaginated(Integer batchSize, Integer offset, String orderBy, String dataspace) {}

  public static ConnectApi.CdpSegmentContainerOutput getSegmentsFilteredPaginated(Integer batchSize, Integer offset, String orderBy, String filters) {}

  public static ConnectApi.CdpSegmentContainerOutput getSegmentsFilteredPaginated(Integer batchSize, Integer offset, String orderBy, String dataspace, String filters) {}

  public static ConnectApi.CdpSegmentOutput updateSegment(String segmentApiName, ConnectApi.CdpSegmentInput input) {}

}