/**
 * Provides methods for creating digests, message authentication codes, and signatures, as well as encrypting and decrypting information.
 */
public class Crypto {

  public static Blob decrypt(String algorithmName, Blob secretKey, Blob initializationVector, Blob cipherText) {}

  public static Blob decryptWithManagedIV(String algorithmName, Blob secretKey, Blob IVAndCipherText) {}

  public static Blob decryptWithManagedIV(String algorithmName, Blob secretKey, Blob IVAndCipherText, Blob aaData) {}

  public static Blob encrypt(String algorithmName, Blob secretKey, Blob initializationVector, Blob clearText) {}

  public static Blob encryptWithManagedIV(String algorithmName, Blob secretKey, Blob clearText) {}

  public static Blob encryptWithManagedIV(String algorithmName, Blob secretKey, Blob clearText, Blob aaData) {}

  public static Blob generateDigest(String algorithmName, Blob input) {}

  public static Blob generateMac(String algorithmName, Blob input, Blob privateKey) {}

  public static Integer getRandomInteger() {}

  public static Long getRandomLong() {}

  public static Blob sign(String algorithmName, Blob input, Blob privateKey) {}

  public static Blob signWithCertificate(String algorithmName, Blob input, String certDevName) {}

  public Void signXML(String algorithmName, Dom.XmlNode node, String idAttributeName, String certDevName) {}

  public static void signXml(String algorithmName, Dom.XmlNode node, String idAttributeName, String certDevName, Dom.XmlNode refChild) {}

  public static Boolean verify(String algorithmName, Blob data, Blob signature, Blob publicKey) {}

  public static Boolean verify(String algorithmName, Blob data, Blob signature, String certDevName) {}

  public static Boolean verifyHMac(String algorithmName, Blob data, Blob privateKey, Blob macToVerify) {}

}