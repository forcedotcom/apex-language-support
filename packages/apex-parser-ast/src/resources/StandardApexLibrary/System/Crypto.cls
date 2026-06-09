/**
 * Provides methods for creating digests, message authentication codes, and signatures, as well as encrypting and decrypting information.
 */
global class Crypto {

  global Crypto() {}

  global static Blob decrypt(String algorithmName, Blob secretKey, Blob initializationVector, Blob cipherText) {}

  global static Blob decryptWithManagedIV(String algorithmName, Blob secretKey, Blob IVAndCipherText) {}

  global static Blob decryptWithManagedIV(String algorithmName, Blob secretKey, Blob IVAndCipherText, Blob aaData) {}

  global static Blob encrypt(String algorithmName, Blob secretKey, Blob initializationVector, Blob clearText) {}

  global static Blob encryptWithManagedIV(String algorithmName, Blob secretKey, Blob clearText) {}

  global static Blob encryptWithManagedIV(String algorithmName, Blob secretKey, Blob clearText, Blob aaData) {}

  global static Blob generateDigest(String algorithmName, Blob input) {}

  global static Blob generateMac(String algorithmName, Blob input, Blob privateKey) {}

  global static Integer getRandomInteger() {}

  global static Long getRandomLong() {}

  global static Blob sign(String algorithmName, Blob input, Blob privateKey) {}

  global static Blob signWithCertificate(String algorithmName, Blob input, String certDevName) {}

  global void signXML(String algorithmName, Dom.XmlNode node, String idAttributeName, String certDevName) {}

  global static void signXml(String algorithmName, Dom.XmlNode node, String idAttributeName, String certDevName, Dom.XmlNode refChild) {}

  global static Boolean verify(String algorithmName, Blob data, Blob signature, Blob publicKey) {}

  global static Boolean verify(String algorithmName, Blob data, Blob signature, String certDevName) {}

  global static Boolean verifyHMac(String algorithmName, Blob data, Blob privateKey, Blob macToVerify) {}

  global Object clone() {}

  global static Blob generateAesKey(Integer size) {}

}