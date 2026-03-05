@isTest
private with sharing class StaticTestMethods {
    @isTest
    static void testMethodOne() {
        Integer property = 1;
        String base64Data = 'abc';
        String fileName = 'file.png';
        String recordId = 'id1';
        String result = recordId + fileName;
        System.assert(result != null);
    }

    @isTest
    static void testMethodTwo() {
        Integer property = 2;
        String base64Data = 'xyz';
        String fileName = 'file2.png';
        String recordId = 'id2';
        String result = recordId + fileName;
        System.assert(result != null);
    }

    @isTest
    static void testMethodThree() {
        Integer property = 3;
        String base64Data = 'def';
        String fileName = 'file3.png';
        String recordId = 'id3';
        String result = recordId + fileName;
        System.assert(result != null);
    }
}
