//Initialise functions
{
  global.computeVIF = function (arg0_X) {
    //Convert from parameters
    var X = arg0_X;

    //Declare local instance variables
    var XT_X = mathjs.multiply(mathjs.transpose(X), X);
    var XT_X_inv = mathjs.inv(XT_X);
    var vif = XT_X_inv.map((row, i) => row[i]);

    //Return statement
    return vif;
  };

  global.conditionNumber = function (arg0_X, arg1_epsilon) {
    //Convert from parameters
    var X = arg0_X;
    var epsilon = returnSafeNumber(arg1_epsilon, 1e-12);

    //Declare local instance variables
    try {
      X = X._data;
    } catch (e) {}

    var matrix = new ml_matrix.SVD(X, { autoTranspose: true });
    var singular_values = matrix.diagonal;

    //Find max and min singular values
    var max_s = Math.max(...singular_values);
    var min_s = Math.max(Math.min(...singular_values), epsilon); //Ensure min_s is never 0

    //Return statement
    return max_s/min_s;
  };

  global.removeHighVIFFeatures = function (arg0_X, arg1_threshold) {
    //Convert from parameters
    var X = arg0_X;
    var threshold = returnSafeNumber(arg1_threshold, 10);

    //Declare local instance variables
    var vif_scores = computeVIF(X);
    console.log(`- Computed VIF scores.`);
    var to_keep = vif_scores.map((vif, i) => (vif < threshold));
    console.log(`- Found VIF scores to keep.`);

    //Return statement
    return X.map((row) => row.filter((_, index) => to_keep[index]));
  };

  global.ridgeRegression = function (arg0_X, arg1_Y, arg2_lambda) {
    //Convert from parameters
    var X = arg0_X;
    var Y = arg1_Y;
    var lambda = returnSafeNumber(arg2_lambda, 1e-3);

    //Declare local instance variables
    var XT = mathjs.transpose(X);
    var XT_X = mathjs.multiply(XT, X);
    var identity = mathjs.identity(XT_X.size()[0]);

    var XT_X_reg = mathjs.add(XT_X, mathjs.multiply(identity, lambda)); //Ridge term
    var XT_Y = mathjs.multiply(XT, Y);

    //Return statement; return beta
    return mathjs.multiply(mathjs.inv(XT_X_reg), XT_Y);
  };
}