function generateRandomString(length) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  const randomString = Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return randomString;
}

let amount = 300000;
const urlParams = new URLSearchParams(window.location.search);
const plan = urlParams.get("plan")?.toLowerCase() || "basic";
const pls = document.getElementById("plan_show");
var sentOtp = false;
btn = document.getElementById("continueBtn");
subPlan = "Basic";
btnText = "Continue";
hasPaid = false;

function payWithPaystack(email, phone, amount, plan) {
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
          display_name: "Subscription Plan",
          variable_name: "subscription_plan",
          value: plan,
        },
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
        const apiUrl = `/api/request?phone=${phone}&key=${verify_key}&plan=${subPlan}`;

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
        emailRegex.test(email)
      ) {
        event.preventDefault();

        const phoneNumber = countryCode + phone.trim();

        let paid_before = true;
        let otp_ = true;

        await fetch(`/api/confirm?phone=${phoneNumber}&plan=${subPlan}`)
          .then((response) => response.json())
          .then((data) => {
            if (data.status == 200 && data.failed == false) {
              paid_before = data.paid;
              otp_ = data.otp;
            }
            console.log("Success:");
          })
          .catch((error) => {
            console.error("Error:", error);
          });

        if (paid_before == true && otp_ == true) {
          Swal.fire({
            icon: "info",
            title: "Duplicate Subscription",
            text: "Seems this number has been subscribed already, please try different number!",
          });
        } else {
          if (paid_before == false) {
            let amount_sent;
            await fetch(`/api/get_amount?phone=${phoneNumber}&plan=${subPlan}`)
              .then((response) => response.json())
              .then((data) => {
                if (data.status == 200 && data.failed == false) {
                  amount_sent = data.amount;
                }
                console.log("Success:");
              })
              .catch((error) => {
                console.error("Error:", error);
              });
            payWithPaystack(email, phoneNumber, amount_sent, subPlan);
          }
        }

        if (paid_before == true && otp_ == false) {
          if (!sentOtp) {
            btn.disabled = true;
            btnText = "Please wait...";
            btn.innerHTML = btnText;

            const apiUrl = `/api/request?phone=${phoneNumber}&key=${verify_key}&plan=${subPlan}`;

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
                console.error(error);
              });
          }
        } else if (paid_before == true && otp_ == true) {
          Swal.fire({
            icon: "info",
            title: "Duplicate Subscription",
            text: "Seems this number has been subscribed already, please try different number!",
          });
        }
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
  if (sentOtp) {
    if (otpValue.length < 6) {
      Swal.fire({
        icon: "error",
        title: "Invalid or Expired Code",
        text: "The OTP code is invalid or has expired. Please check again",
      });
    } else {
      const apiUrl = `/api/verify?phone=${phoneNumber}&subscription=${subPlan}&code=${otpValue.trim()}&key=${verify_key}`;

      fetch(apiUrl)
        .then((response) => response.json())
        .then(async (data) => {
          if (data.failed === "Invalid or Expired Code") {
            Swal.fire({
              icon: "error",
              title: "Invalid or Expired Code",
              text: "The OTP code is invalid or has expired.",
            });
          } else if (data.successful.startsWith("Congratulations")) {
            await fetch("/api/set_otp", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                plan: subPlan,
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
              text: `You are now registered as ${subPlan} user.`,
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
