public class EnhancedForCollectionMismatch {
    public void validateLoopVariable() {
        List<String> values = new List<String>();
        for (Integer value : values) {
            System.debug(value);
        }
    }
}
