@RestResource(urlMapping='/api/very/long/url/path/that/exceeds/two/hundred/fifty/five/characters/and/should/trigger/an/error/because/it/is/longer/than/the/maximum/allowed/length/of/two/hundred/fifty/five/characters/for/rest/resource/url/mappings/in/apex/which/is/a/very/specific/requirement/that/must/be/enforced')
public class RestResourceTooLong {
}
