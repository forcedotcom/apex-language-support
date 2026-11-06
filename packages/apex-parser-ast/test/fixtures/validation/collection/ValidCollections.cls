public class ValidCollections {
    public void testCollections() {
        List<String> list1 = new List<String>(5);
        List<String> list2 = new List<String>();
        Set<String> sourceSet = new Set<String>();
        List<String> listFromSet = new List<String>(sourceSet);
        List<String> listFromList = new List<String>(new List<String>(1));
        Set<Integer> set1 = new Set<Integer>();
        Set<String> setFromList = new Set<String>(new List<String>(1));
        Set<String> setFromSet = new Set<String>(new Set<String>());
        Map<String, Integer> map1 = new Map<String, Integer>();
        Map<String, Integer> mapFromMap = new Map<String, Integer>(
            new Map<String, Integer>()
        );
        
        List<String> myList = new List<String>();
        String value = myList[0];
    }
}
