function generateRandomString(length) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  const randomString = Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return randomString;
}



const alert_div = document.getElementById("alert_show");
U_form_trigger = document.getElementById("trigger_form");
paymentForm = document.getElementById("paymentForm");
UpaymentForm = document.getElementById("UncompletedForm");
var sentOtp = false;
btn = document.getElementById("continueBtn");
btn2 = document.getElementById("UcontinueBtn");

btnText = "Continue";
hasPaid = false;
var reference;

U_form_trigger.addEventListener("click", () => {
  if (UpaymentForm.classList.contains("d-none")) {
    UpaymentForm.classList.remove("d-none");
    paymentForm.classList.add("d-none");
    U_form_trigger.innerText = "Make New Payment";
    alert_div.innerText = "Okay! Let's continue from where we stopped";
  } else {
    UpaymentForm.classList.add("d-none");
    paymentForm.classList.remove("d-none");
    U_form_trigger.innerText = "Have an Uncompleted Payment ?";
    alert_div.innerText = "Start your journey with Binx ! Pay as You Go";
  }
});
function payWithPaystack(email, phone, amount, amount_dollars) {
  console.log(phone)
  var handler = PaystackPop.setup({
    key: publicKey,
    email: email,
    amount: amount,
    phone: phone,
    currency: "NGN",
    ref: "" + Math.floor(Math.random() * 1000000000 + 1),
    metadata: {
      custom_fields: [
        {
          display_name: "Phone Number",
          variable_name: "phone_number",
          value: phone,
        },
        {
          display_name: "Amount Dollars",
          variable_name: "amount_dollars",
          value: amount_dollars
        }
      ],
    },
    callback: function (response) {
      const currentDate = new Date();
      const options = { day: "numeric", month: "short", year: "numeric" };
      const formattedDate = currentDate.toLocaleDateString("en-US", options);

      Swal.fire({
        icon: "success",
        title: "Payment complete!",
        text: "Reference: " + response.reference,
      }).then((value) => {
        hasPaid = true;
        btn.disabled = true;
        btnText = "Please wait...";
        btn.innerHTML = btnText;
        reference = response.reference
        const apiUrl = `/api/request?phone=${phone}&key=${verify_key}&reference=${response.reference}`;

        // Make a GET request to the API
        fetch(apiUrl)
          .then((response) => response.json())
          .then((data) => {
            if (data.successful === "Open Your WhatsApp!") {
              document.getElementById("otp-div").classList.remove("d-none");

              Swal.fire({
                icon: "success",
                title: "Code Sent",
                text: "OTP code have been sent to your whatsapp!",
              }).then((value) => {
                btn.disabled = false;
                btnText = "Continue";
                btn.innerHTML = btnText;
                sentOtp = true;
              });
            } else if (data.cooldown) {
              Swal.fire({
                icon: "info",
                title: "Cooldown",
                text: data.cooldown,
              });
            } else {
              Swal.fire({
                icon: "error",
                title: "Invalid Whatsapp Number",
                text: "Oopps! Seems you provided an invalid WhatsApp number",
              }).then((value) => {
                btn.disabled = false;
                btnText = "Continue";
                btn.innerHTML = btnText;
                sentOtp = false;
              });
            }
          })
          .catch((error) => {
            // Handle any errors
            console.error(error);
          });
      });
    },
    onClose: function () {
      Swal.fire({
        icon: "error",
        title: "Transaction not completed!",
        text: "Window closed.",
      });
    },
  });
  handler.openIframe();
}
const phoneField = document.getElementById("phoneNumber");
phoneField.addEventListener("input", function (event) {
  const inputValue = event.target.value;
  const numericValue = inputValue.replace(/\D/g, "");

  event.target.value = numericValue;
});
// Add event listener to the form submit event
document
  .getElementById("paymentForm")
  .addEventListener("submit", async function (event) {
    const fname = document.getElementById("firstName").value;
    const lname = document.getElementById("lastName").value;
    const name = fname + " " + lname;
    const email = document.getElementById("email").value;
    const amountToDeposit = document.getElementById("amountToDeposit").value
    const phone = document
      .getElementById("phoneNumber")
      .value.replace(/^0+/, "");
    const countryCode = document.getElementById("countryCode").value;
    const otp = document.getElementById("otp-div");
    const otpValue = document.getElementById("otp").value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!otpValue) {
      if (
        fname.trim() !== "" &&
        lname.trim() !== "" &&
        phone.trim() !== "" &&
        amountToDeposit !== "" &&
        emailRegex.test(email)
      ) {
        event.preventDefault();

        const phoneNumber = countryCode + phone.trim();

      
        let amount_sent;
        let amount_dollars;
        await fetch(`/api/get_amount?phone=${phoneNumber}&amount=${amountToDeposit}`)
          .then((response) => response.json())
          .then((data) => {
            console.log("Success:");
            if (data.status == 200 && data.failed == false) {
              amount_sent = data.amount;
              amount_dollars = data.amount_dollars

              payWithPaystack(email, phoneNumber, amount_sent, amount_dollars);

            } else if(data.failed == true){
              Swal.fire({
                icon: "info",
                title: "Couldn't Complete Payment",
                text: `${data.message}`,
              });
            }
          })
          .catch((error) => {
            console.error("Error:", error);
          });

          
        
      }
    } else {
      event.preventDefault();
    }
  });

btn.addEventListener("click", () => {
  const otpValue = document.getElementById("otp").value;
  const phone = document.getElementById("phoneNumber").value.replace(/^0+/, "");
  const countryCode = document.getElementById("countryCode").value;
  const phoneNumber = countryCode.replace("+", "") + phone.trim();
  if (sentOtp && otpValue) {
    if (otpValue.length < 6) {
      Swal.fire({
        icon: "error",
        title: "Invalid or Expired Code",
        text: "The OTP code is invalid or has expired. Please check again",
      });
    } else {
      const apiUrl = `/api/verify?phone=${phoneNumber}&code=${otpValue.trim()}&key=${verify_key}&reference=${reference}`;

      fetch(apiUrl)
        .then((response) => response.json())
        .then(async (data) => {
          if (data.failed === "Invalid or Expired Code") {
            Swal.fire({
              icon: "error",
              title: "Invalid or Expired Code",
              text: "The OTP code is invalid or has expired.",
            });
          } else if(data.success == false){
            Swal.fire({
              icon: "error",
              title: "Invalid or Expired Code",
              text: `${data.message}`,
            });
          } else if (data.successful.startsWith("Congratulations")) {
            await fetch("/api/set_otp", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                reference: reference,
                phone: phoneNumber,
              }),
            })
              .then((response) => response.json())
              .then((data) => console.log("Success:"))
              .catch((error) => {
                console.error("Error:", error);
              });

            Swal.fire({
              icon: "info",
              title: "Congratulations 🎊",
              text: `${data.successful}`,
            }).then((value) => {
              window.location.href =
                "https://wa.me/2349057642334?text=Hello%20Binx%20AI";
            });
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }
});


document
  .getElementById("UncompletedForm")
  .addEventListener("submit", async function (event) {

    const phone = document
      .getElementById("phoneNumber2")
      .value.replace(/^0+/, "");
    const countryCode = document.getElementById("countryCode2").value;
    const otp = document.getElementById("otp-div2");
    const otpValue = document.getElementById("otp2").value;
    const reference = document.getElementById("reference").value;
    if (!otpValue) {
      if (
        phone.trim() !== "" &&
        reference !== ""
      ) {
        event.preventDefault();

        const phoneNumber = countryCode + phone.trim();

        const api = `/api/confirm?phone=${phoneNumber}&reference=${reference}`

        fetch(api)
          .then((response) => response.json())
          .then((data) => {
            if(data.failed == true){
              Swal.fire({
                icon: "error",
                title: "Error",
                text: `${data.message}`,
              })
            } else if(data.failed == false && data.status == 200) {
              if(data.paid == true && data.otp === false ){
                const apiUrl = `/api/request?phone=${phoneNumber}&key=${verify_key}&reference=${reference}`;

                  fetch(apiUrl)
                  .then((response) => response.json())
                  .then((data) => {
                    if (data.successful === "Open Your WhatsApp!") {
                      document.getElementById("otp-div2").classList.remove("d-none");

                      Swal.fire({
                        icon: "success",
                        title: "Code Sent",
                        text: "OTP code have been sent to your whatsapp!",
                      }).then((value) => {
                        btn2.disabled = false;
                        btnText = "Continue";
                        btn2.innerHTML = btnText;
                        sentOtp = true;
                      });
                    } else if (data.cooldown) {
                      Swal.fire({
                        icon: "info",
                        title: "Cooldown",
                        text: data.cooldown,
                      });
                    } else {
                      Swal.fire({
                        icon: "error",
                        title: "Invalid Whatsapp Number",
                        text: "Oopps! Seems you provided an invalid WhatsApp number",
                      }).then((value) => {
                        btn.disabled = false;
                        btnText = "Continue";
                        btn.innerHTML = btnText;
                        sentOtp = false;
                      });
                    }
                  })
                  .catch((error) => {
                    // Handle any errors
                    console.error(error);
                  });
              } else if(data.paid == true) {
                Swal.fire({
                  icon: "info",
                  title: "Payment Completed",
                  text: "You have completed your payment",
                })
              } else {
                Swal.fire({
                  icon: "info",
                  title: "Payment Not Made",
                  text: "You have not made any payment",
                })
              }
            }
          })


        
          
        
      }
    } else {
      event.preventDefault();
    }
  });

  
btn2.addEventListener("click", () => {
  const otpValue = document.getElementById("otp2").value;
  const phone = document.getElementById("phoneNumber2").value.replace(/^0+/, "");
  const countryCode = document.getElementById("countryCode2").value;
  const phoneNumber = countryCode.replace("+", "") + phone.trim();
  const reference = document.getElementById("reference").value;

  if (sentOtp && otpValue) {
    if (otpValue.length < 6) {
      Swal.fire({
        icon: "error",
        title: "Invalid or Expired Code",
        text: "The OTP code is invalid or has expired. Please check again",
      });
    } else {
      const apiUrl = `/api/verify?phone=${phoneNumber}&code=${otpValue.trim()}&key=${verify_key}&reference=${reference}`;

      fetch(apiUrl)
        .then((response) => response.json())
        .then(async (data) => {
          if (data.failed === "Invalid or Expired Code") {
            Swal.fire({
              icon: "error",
              title: "Invalid or Expired Code",
              text: "The OTP code is invalid or has expired.",
            });
          } else if(data.success == false){
            Swal.fire({
              icon: "error",
              title: "Invalid or Expired Code",
              text: `${data.message}`,
            });
          } else if (data.successful.startsWith("Congratulations")) {
            await fetch("/api/set_otp", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                reference: reference,
                phone: phoneNumber,
              }),
            })
              .then((response) => response.json())
              .then((data) => console.log("Success:"))
              .catch((error) => {
                console.error("Error:", error);
              });

            Swal.fire({
              icon: "info",
              title: "Congratulations 🎊",
              text: `${data.successful}`,
            }).then((value) => {
              window.location.href =
                "https://wa.me/2349057642334?text=Hello%20Binx%20AI";
            });
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }
});


