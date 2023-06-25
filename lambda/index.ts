exports.handler = async (event: any, ...context: any[]) => {
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      event,
      context
    }),
  };

  return response;
};
