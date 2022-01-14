const _ = require("lodash");
const { query, loggedQuery } = require("../database");
const {
  status,
  statusSuccess,
  statusError
} = require("../helpers/status");

const dict = {
  success: {
    dataReceived: "Данные получены.",
    dataUpdated: "Данные обновлены.",
  },
  errors: {
    unknown: "Неизвестная ошибка.",
  }
}

const read = async (req, res) => {

  try {
    const getUsersQuery = `
      SELECT
        coalesce(c.phone, '') as phone,
        coalesce(c.additional_phone, '') as additionalphone,
        coalesce(c.email, '') as email,
        coalesce(c.postal_code, '') as postalcode,
        coalesce(c.address, '') as address,
        coalesce(c.full_address, '') as fulladdress,
        coalesce(c.organization_name, '') as organizationname,
        coalesce(c.account_number, '') as accountnumber,
        coalesce(c.beneficiary_bank, '') as beneficiarybank,
        coalesce(c.bik, '') as bik,
        coalesce(c.correction_account, '') as correctionaccount,
        coalesce(c.inn, '') as inn,
        coalesce(c.psrn, '') as psrn,
        coalesce(c.checkpoint_number, '') as checkpointnumber,
        coalesce(c.yandex_map, '') as yandexmap,
        coalesce(c.site_title, '') as sitetitle,
        coalesce(c.site_description, '') as sitedescription,
        coalesce(c.site_keywords, '') as sitekeywords,
        coalesce(c.site_name, '') as sitename,
        coalesce(c.full_organization_name, '') as fullorganizationname
      FROM
        company c
      WHERE
      c.id_company = 1;
    `;
    const dbResponse = await query(getUsersQuery);
    statusSuccess.data = _.first(dbResponse);
    statusSuccess.message = dict.success.dataReceived;
    return res.status(status.success).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}

const update = async (req, res) => {
  const {
    phone,
    additionalphone,
    email,
    postalcode,
    address,
    fulladdress,
    organizationname,
    accountnumber,
    beneficiarybank,
    bik,
    correctionaccount,
    inn,
    psrn,
    checkpointnumber,
    yandexmap,
    sitetitle,
    sitedescription,
    sitekeywords,
    sitename,
    fullorganizationname
  } = req.query;

  try {
    const updateUserQuery = `
      UPDATE company SET
        phone=$1,
        additional_phone=$2,
        email=$3,
        postal_code=$4,
        address=$5,
        full_address=$6,
        organization_name=$7,
        account_number=$8,
        beneficiary_bank=$9,
        bik=$10,
        correction_account=$11,
        inn=$12,
        psrn=$13,
        checkpoint_number=$14,
        yandex_map=$15,
        site_title=$16,
        site_description=$17,
        site_keywords=$18,
        site_name=$19,
        full_organization_name=$20,
        change_seq_id=nextval('id_change'::regclass)
      WHERE id_company=1 returning *;
    `;

    const updateValue = [
      phone,
      additionalphone,
      email,
      postalcode,
      address,
      fulladdress,
      organizationname,
      accountnumber,
      beneficiarybank,
      bik,
      correctionaccount,
      inn,
      psrn,
      checkpointnumber,
      yandexmap,
      sitetitle,
      sitedescription,
      sitekeywords,
      sitename,
      fullorganizationname
    ];

    const updateResponse = await loggedQuery(req.user.id, updateUserQuery, updateValue);
    const firstRow = _.first(updateResponse);

    statusSuccess.data = {
      phone: firstRow?.phone,
      additionalphone: firstRow?.additional_phone,
      email: firstRow?.email,
      postalcode: firstRow?.postal_code,
      address: firstRow?.address,
      fulladdress: firstRow?.full_address,
      organizationname: firstRow?.organization_name,
      accountnumber: firstRow?.account_number,
      beneficiarybank: firstRow?.beneficiary_bank,
      bik: firstRow?.bik,
      correctionaccount: firstRow?.correction_account,
      inn: firstRow?.inn,
      psrn: firstRow?.psrn,
      checkpointnumber: firstRow?.checkpoint_number,
      yandexmap: firstRow?.yandex_map,
      sitetitle: firstRow?.site_title,
      sitedescription: firstRow?.site_description,
      sitekeywords: firstRow?.site_keywords,
      sitename: firstRow?.site_name,
      fullorganizationname: firstRow?.full_organization_name
    };

    statusSuccess.message = dict.success.dataUpdated;
    return res.status(status.created).send(statusSuccess);
  } catch (error) {
    console.error(error);
    statusError.message = dict.errors.unknown;
    return res.status(status.error).send(statusError);
  }
}

module.exports = {
  read,
  update
}
