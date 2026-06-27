rabbitMq.subscribe(
  "auth.otp.required",
  otpRequiredConsumer.handle.bind(otpRequiredConsumer),
);
