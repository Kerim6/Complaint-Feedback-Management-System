// middleware/auth.js
export function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/");
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).render("layout", {
      title: "Access Denied",
      body: "access-denied",
      session: req.session,
      error: null,
    });
  }
  next();
}

export function requireStaff(req, res, next) {
  if (
    req.session.user &&
    ["staff", "manager", "admin"].includes(req.session.user.role)
  ) {
    return next();
  }
  return res.redirect("/");
}

export function addWorkingDays(startDate, workingDays) {
  const date = new Date(startDate);
  let addedDays = 0;

  while (addedDays < workingDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
      addedDays++;
    }
  }
  return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
}
