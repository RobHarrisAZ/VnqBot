class HttpResponseError extends Error {
  constructor(response, ...args) {
    this.response = response;
    super(
      `HTTP Error Response: ${response.status} ${response.statusText}`,
      ...args
    );
  }
}
module.exports = { HttpResponseError };
